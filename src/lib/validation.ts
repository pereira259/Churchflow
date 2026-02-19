import { z } from 'zod';

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export const signUpSchema = z.object({
    fullName: z.string().min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string()
        .min(8, 'A senha deve ter no mínimo 8 caracteres')
        .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
        .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
    phone: z.string().optional(),
});

export const resetPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
});

// ==========================================
// TRANSACTION SCHEMAS
// ==========================================

export const transactionSchema = z.object({
    type: z.enum(['income', 'expense'], { required_error: 'Tipo é obrigatório' }),
    amount: z.number().positive('O valor deve ser positivo'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
    payment_method: z.string().optional(),
});

// ==========================================
// MEMBER SCHEMAS
// ==========================================

export const memberSchema = z.object({
    full_name: z.string().min(3, 'Nome completo é obrigatório'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().min(10, 'Telefone inválido'),
    birth_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
    role: z.enum(['membro', 'visitante', 'lider', 'admin']).default('membro'),
    status: z.enum(['ativo', 'inativo']).default('ativo'),
});
