export const ERP_BOOTSTRAP_COOKIE = '__Host-urisa_erp_bootstrap'
export const ERP_SESSION_COOKIE = '__Host-urisa_erp_session'

export const ERP_HOST = 'erp.urisacompresores.com'
export const PORTAL_HOST = 'portal.urisacompresores.com'

export const ERP_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60
export const ERP_BOOTSTRAP_MAX_AGE_SECONDS = 120

export function fixedErpRuntimeUrl(): URL {
  return new URL('https://erp.urisacompresores.com/')
}

export function fixedErpExchangeUrl(code: string): URL {
  const url = new URL('https://erp.urisacompresores.com/urisa-auth/exchange')
  url.searchParams.set('code', code)
  return url
}
