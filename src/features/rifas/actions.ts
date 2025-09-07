'use server'

import { db } from '@/lib/db';
import { raffles, tickets, paymentMethods } from '@/lib/db/schema';
import { eq, and, or, gt } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export async function getRaffleData(raffleId: string) {
  try {
    // Get raffle with its images, tickets, and winner info
    const raffle = await db.query.raffles.findFirst({
      where: eq(raffles.id, raffleId),
      with: {
        images: true,
        // Count sold tickets and non-expired reserved tickets
        tickets: {
          where: or(
            eq(tickets.status, 'sold'),
            and(
              eq(tickets.status, 'reserved'),
              gt(tickets.reservedUntil, new Date())
            )
          ),
          columns: { id: true }
        },
        winnerTicket: {
          with: {
            purchase: true
          }
        }
      },
    });

    if (!raffle || raffle.status === 'draft') {
      notFound();
    }

    // Get active payment methods
    const activePaymentMethods = await db.query.paymentMethods.findMany({
      where: eq(paymentMethods.isActive, true),
    });

    return {
      success: true,
      data: {
        raffle,
        paymentMethods: activePaymentMethods,
        ticketsTakenCount: raffle.tickets.length
      }
    };
  } catch (error) {
    console.error('Error fetching raffle data:', error);
    return {
      success: false,
      error: 'Error al cargar la rifa'
    };
  }
}
