import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  const { amount, eventId } = await request.json();
  
  const order = await razorpay.orders.create({
    amount: amount * 100, // Razorpay expects amount in paise
    currency: 'INR',
    notes: {
      eventId,
    },
  });
  
  return NextResponse.json(order);
}