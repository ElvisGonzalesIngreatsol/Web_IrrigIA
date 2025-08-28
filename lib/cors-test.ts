export async function testCorsConfiguration(baseUrl: string): Promise<{
  success: boolean
  message: string
  details: any
}> {
  try {
    console.log(`[v0] Testing CORS for: ${baseUrl}`)

    // Test with OPTIONS request first (preflight)
    const optionsResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "OPTIONS",
      mode: "cors",
      headers: {
        Origin: window.location.origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    })

    console.log(`[v0] OPTIONS Response Status:`, optionsResponse.status)
    console.log(`[v0] OPTIONS Response Headers:`)

    const corsHeaders: any = {}
    optionsResponse.headers.forEach((value, key) => {
      corsHeaders[key] = value
      console.log(`[v0]   ${key}: ${value}`)
    })

    const hasCorsHeaders = corsHeaders["access-control-allow-origin"] || corsHeaders["Access-Control-Allow-Origin"]

    if (!hasCorsHeaders) {
      return {
        success: false,
        message: "CORS headers no encontrados en la respuesta OPTIONS",
        details: { corsHeaders, status: optionsResponse.status },
      }
    }

    return {
      success: true,
      message: "CORS configurado correctamente",
      details: { corsHeaders, status: optionsResponse.status },
    }
  } catch (error) {
    console.error("[v0] CORS Test Error:", error)
    return {
      success: false,
      message: `Error al probar CORS: ${error.message}`,
      details: { error: error.message },
    }
  }
}
