"use server"

import { prisma } from "@/lib/db"

export async function getFaqs() {
    try {
        const faqs = await prisma.faq.findMany({
            orderBy: { order: 'asc' }
        })
        return { success: true, data: faqs }
    } catch (error) {
        console.error("Error fetching FAQs:", error)
        return { success: false, data: [] }
    }
}

export async function getBlogPosts() {
    try {
        const posts = await prisma.blogPost.findMany({
            where: { published: true },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: posts }
    } catch (error) {
        console.error("Error fetching blog posts:", error)
        return { success: false, data: [] }
    }
}

export async function getRecipes() {
    try {
        const recipes = await prisma.recipe.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: recipes }
    } catch (error) {
        console.error("Error fetching recipes:", error)
        return { success: false, data: [] }
    }
}

export async function getPartners() {
    try {
        const partners = await prisma.partner.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: partners }
    } catch (error) {
        console.error("Error fetching partners:", error)
        return { success: false, data: [] }
    }
}

export async function getSiteSetting(key: string) {
    try {
        const setting = await prisma.siteSetting.findUnique({
            where: { key }
        })
        return { success: true, data: setting?.value || null }
    } catch (error) {
        console.error(`Error fetching site setting ${key}:`, error)
        return { success: false, data: null }
    }
}

export async function getBlogPost(id: string) {
    try {
        const post = await prisma.blogPost.findUnique({
            where: { id }
        })
        return { success: true, data: post }
    } catch (error) {
        console.error(`Error fetching blog post ${id}:`, error)
        return { success: false, data: null }
    }
}

export async function getRecipe(id: string) {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id }
        })
        return { success: true, data: recipe }
    } catch (error) {
        console.error(`Error fetching recipe ${id}:`, error)
        return { success: false, data: null }
    }
}
