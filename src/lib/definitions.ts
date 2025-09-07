// lib/definitions.ts

export interface Raffle {
  id: string;
  name: string;
  description?: string;
  price: string;
  minimumTickets: number;
  status: 'active' | 'finished' | 'cancelled' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  raffleId: string;
  buyerName?: string;
  buyerEmail: string;
  buyerPhone?: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'rejected';
  paymentReference?: string;
  paymentScreenshotUrl?: string;
  paymentMethod?: string;
  ticketCount: number;
  createdAt: Date;
  raffle?: Raffle;
  tickets?: Ticket[];
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  raffleId: string;
  purchaseId: string;
}

export interface User {
  id: string;
  name?: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

declare module "next-auth" {
  interface User {
    role?: string;
  }
  
  interface Session {
    user: {
      id: string;
      role?: string;
      email?: string;
      name?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}