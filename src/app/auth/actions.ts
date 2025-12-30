
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import Stripe from 'stripe'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function handlePostAuthRedirect(formData: FormData, userId: string, email: string | undefined) {
    const priceId = formData.get('priceId') as string
    const view = formData.get('view') as string
    let redirectUrl = view ? `/?view=${view}` : '/'

    if (priceId && userId) {
        try {
            // Create Stripe Session immediately
            const origin = (await headers()).get('origin')
            // Append view param to success/cancel urls if present
            const successUrl = view ? `${origin}/?success=true&view=${view}` : `${origin}/?success=true`
            const cancelUrl = view ? `${origin}/?canceled=true&view=${view}` : `${origin}/?canceled=true`

            const session = await stripe.checkout.sessions.create({
                mode: priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD ? 'payment' : 'subscription',
                payment_method_types: ['card'],
                client_reference_id: userId,
                customer_email: email,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                success_url: successUrl,
                cancel_url: cancelUrl,
            })

            if (session.url) {
                redirectUrl = session.url
            }
        } catch (e) {
            console.error('Stripe Redirect Failed', e)
            // Fallback to dashboard if stripe fails
        }
    }

    revalidatePath('/', 'layout')
    redirect(redirectUrl)
}

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    await handlePostAuthRedirect(formData, data.user.id, data.user.email)
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    // Confirmed: signUp returns session if confirm is off.
    if (data.session) {
        await handlePostAuthRedirect(formData, data.user?.id!, data.user?.email)
    } else {
        // If email confirmation is ON, we should probably tell them to check email.
        // But assuming it's off:
        revalidatePath('/', 'layout')
        redirect('/')
    }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/')
}
