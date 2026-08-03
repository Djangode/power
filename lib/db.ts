import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'
import '@/lib/env'

const databaseUrl = process.env.DATABASE_URL || ''

// Nettoyage URL (channel_binding cause des problèmes)
const cleanUrl = databaseUrl
    .replace(/&channel_binding=[^&]*/g, '')
    .replace(/\?channel_binding=[^&]*&?/, '?')
    .replace(/\?$/, '')

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function makePrisma(): PrismaClient {
    if (!cleanUrl || cleanUrl.includes('xxx') || cleanUrl.includes('placeholder')) {
        // En production, ce mode transformerait une base injoignable en site parfaitement
        // vide — catalogue sans produits, commandes introuvables — sans la moindre erreur
        // dans les journaux. Mieux vaut refuser de démarrer que servir une boutique fantôme.
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                'DATABASE_URL absent ou invalide en production. Le mode dégradé sans base est ' +
                'volontairement désactivé ici : il masquerait la panne derrière un site vide.',
            )
        }

        console.warn('⚠️  DATABASE_URL non configuré — mode mock activé. Les données ne seront pas persistées.')
        // Mode sans DB : retourne un mock qui ne crashe pas
        return new Proxy({}, {
            get(_, prop) {
                if (typeof prop === 'string' && prop.startsWith('$')) return () => Promise.resolve()
                if (typeof prop === 'symbol' || prop === 'then') return undefined
                return new Proxy({}, {
                    get(_, method) {
                        return () => {
                            const m = String(method)
                            if (m === 'findMany' || m === 'groupBy') return Promise.resolve([])
                            if (m === 'findUnique' || m === 'findFirst') return Promise.resolve(null)
                            if (m === 'count') return Promise.resolve(0)
                            return Promise.resolve(null)
                        }
                    }
                })
            }
        }) as unknown as PrismaClient
    }

    const adapter = new PrismaNeonHttp(cleanUrl, { fullResults: false })
    return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? makePrisma()

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}
