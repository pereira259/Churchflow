import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        // Supabase injeta a sessão via URL automaticamente
        supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                // sessão ativa, pode redefinir
            }
        })
    }, [])

    const handleReset = async () => {
        if (password !== confirm) {
            setError('As senhas não coincidem.')
            return
        }
        if (password.length < 6) {
            setError('Mínimo 6 caracteres.')
            return
        }
        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
            if (error.message.includes('different')) {
                setError('A nova senha deve ser diferente da atual.')
            } else {
                setError('Erro ao redefinir. Tente novamente.')
            }
        } else {
            setSuccess(true)
            setTimeout(() => navigate('/login'), 3000)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-[#1e1b4b] mb-2">
                    Redefinir Senha
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Digite sua nova senha abaixo.
                </p>

                {success ? (
                    <div className="text-green-600 text-center font-medium">
                        Senha redefinida! Redirecionando para o login...
                    </div>
                ) : (
                    <>
                        <div className="relative mb-3">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Nova senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e1b4b]"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400 text-sm">
                                {showPassword ? 'Ocultar' : 'Ver'}
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="Confirmar nova senha"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e1b4b]"
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-3 text-gray-400 text-sm">
                                {showConfirm ? 'Ocultar' : 'Ver'}
                            </button>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm mb-3">{error}</p>
                        )}
                        <button
                            onClick={handleReset}
                            disabled={loading}
                            className="w-full bg-[#1e1b4b] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
                        >
                            {loading ? 'Salvando...' : 'Confirmar nova senha'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}