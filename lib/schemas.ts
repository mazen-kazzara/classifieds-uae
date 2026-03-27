import { z } from "zod";

export const paymentWebhookSchema = z.object({
  providerRef: z.string().min(1),
  submissionId: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  transactionId: z.string().optional(),
});