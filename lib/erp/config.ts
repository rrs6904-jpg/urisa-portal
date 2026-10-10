export const ERP_FULL_STAGE = process.env.URISA_ERP_FULL_STAGE === '1'
export const ERP_AUTH_BASE_PATH = ERP_FULL_STAGE ? '/urisa-auth/full' : '/urisa-auth'
export const ERP_PORTAL_AUTHORIZE_PATH = ERP_FULL_STAGE ? '/erp/full/authorize' : '/erp/authorize'
export const ERP_PORTAL_LOGIN_PATH = ERP_FULL_STAGE ? '/erp/full/login' : '/erp/login'
export const ERP_PORTAL_LOGOUT_PATH = ERP_FULL_STAGE ? '/erp/full/logout' : '/erp/logout'
export const ERP_BOOTSTRAP_COOKIE = ERP_FULL_STAGE ? '__Host-urisa_erp_full_bootstrap' : '__Host-urisa_erp_bootstrap'
export const ERP_SESSION_COOKIE = ERP_FULL_STAGE ? '__Host-urisa_erp_full_session' : '__Host-urisa_erp_session'

export const ERP_HOST = 'erp.urisacompresores.com'
export const PORTAL_HOST = 'portal.urisacompresores.com'

export const ERP_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60
export const ERP_BOOTSTRAP_MAX_AGE_SECONDS = 120

export function fixedErpRuntimeUrl(): URL {
  return new URL('https://erp.urisacompresores.com/')
}

export function fixedErpExchangeUrl(code: string): URL {
  const url = new URL(`https://erp.urisacompresores.com${ERP_AUTH_BASE_PATH}/exchange`)
  url.searchParams.set('code', code)
  return url
}
