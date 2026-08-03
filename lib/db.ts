import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'
import '@/lib/env'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

/** Nettoyage URL : channel_binding pose problème avec l'adaptateur Neon HTTP. */
function cleanDatabaseUrl(raw: string): string {
    return raw
        .replace(/&channel_binding=[^&]*/g, '')
        .replace(/\?channel_binding=[^&]*&?/, '?')
        .replace(/\?$/, '')
}

function makePrisma(): PrismaClient {
    const cleanUrl = cleanDatabaseUrl(process.env.DATABASE_URL || '')

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

/**
 * Construction paresseuse : le client n'est instancié qu'à la première utilisation, jamais
 * à l'import. Sinon `next build` — qui importe toutes les routes pour collecter les données
 * de page — déclencherait la construction (et le garde-fou production ci-dessus) alors
 * qu'aucune base n'est nécessaire pour builder. Le build n'a pas besoin de DATABASE_URL ;
 * le runtime, lui, l'a toujours.
 */
function getClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = makePrisma()
    }
    return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        const client = getClient()
        const value = (client as unknown as Record<string | symbol, unknown>)[prop]
        return typeof value === 'function' ? value.bind(client) : value
    },
})
