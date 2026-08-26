// -------------------------------------------------------
// Google OAuth 2.0 — Login com Google (Sheets Mode)
//
// Fluxo:
//   1. Abre popup OAuth do Google com escopo de e-mail/perfil
//   2. Obtém o credential (id_token JWT)
//   3. Decodifica localmente para extrair email + nome + foto
//   4. A validação de autorização é feita pelo authStore (via planilha)
// -------------------------------------------------------

export interface GoogleUserInfo {
    sub: string       // Google User ID único
    email: string
    name: string
    picture: string
    email_verified: boolean
}

// Decodifica um JWT sem verificar a assinatura (seguro do lado cliente)
export function decodeJwt(token: string): GoogleUserInfo {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
        atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    )
    return JSON.parse(json)
}

// Inicia o fluxo de login com Google via OAuth2 Popup
// Retorna as informações do usuário Google após autenticação bem-sucedida
export async function signInWithGooglePopup(clientId: string): Promise<GoogleUserInfo> {
    return new Promise((resolve, reject) => {
        const redirectUri = `${window.location.origin}/oauth-callback`
        const scope = 'openid email profile'
        const nonce = Math.random().toString(36).substring(2)

        // Guarda o nonce para validação posterior
        sessionStorage.setItem('argos_oauth_nonce', nonce)

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'id_token',
            scope,
            nonce,
            prompt: 'select_account',
        })

        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

        const width = 500
        const height = 600
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2
        const popup = window.open(
            oauthUrl,
            'google-oauth',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        )

        if (!popup) {
            reject(new Error('Popup bloqueado. Por favor, permita popups para este site.'))
            return
        }

        // Escuta a mensagem da janela de callback
        const handler = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data?.type !== 'ARGOS_GOOGLE_AUTH') return

            window.removeEventListener('message', handler)

            if (event.data.error) {
                reject(new Error(event.data.error))
                return
            }

            try {
                const userInfo = decodeJwt(event.data.idToken)
                resolve(userInfo)
            } catch {
                reject(new Error('Falha ao processar token do Google'))
            }
        }

        window.addEventListener('message', handler)

        // Detecta se o popup foi fechado sem completar
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed)
                window.removeEventListener('message', handler)
                reject(new Error('Login cancelado'))
            }
        }, 500)
    })
}
