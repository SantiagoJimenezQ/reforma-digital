import { z } from 'zod';
export const categorySchema = z.enum([
  'common',
  'jurisdiction',
  'ambiguous',
  'unanswerable',
  'adversarial',
  'freshness',
  'citation',
]);
export const evalCaseSchema = z.object({
  id: z.string(),
  query: z.string().min(4),
  metadata: z.object({
    category: categorySchema,
    difficulty: z.enum(['easy', 'medium', 'hard']),
  }),
  critical: z.boolean().default(false),
  golden: z.boolean().default(false),
  review: z.object({
    status: z.enum(['pending', 'approved']),
    reviewer: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    evidenceNotes: z.string(),
  }),
  expected: z.object({
    relevantSourceIds: z.array(z.string()).default([]),
    relevantDocumentIds: z.array(z.string()).default([]),
    relevanceGrades: z.record(z.string(), z.number().min(0).max(3)).default({}),
    mustContainFacts: z.array(z.string()).default([]),
    mustNotContainFacts: z.array(z.string()).default([]),
    expectedJurisdiction: z.string().optional(),
    expectedOrganization: z.string().optional(),
    shouldAnswer: z.boolean(),
  }),
});
export type EvalCase = z.infer<typeof evalCaseSchema>;
export const datasetSchema = z.object({
  version: z.string(),
  description: z.string(),
  cases: z.array(evalCaseSchema).min(1),
});
export type Dataset = z.infer<typeof datasetSchema>;
