export const prerender = false;

export const POST = async (context) => {
  const { request } = context;

  try {
    const { passcode } = await request.json();
    
    // Robust environment variable resolution supporting build-time, runtime, and Cloudflare Pages/Workers context
    const getEnv = (key) => {
      return import.meta.env[key] || 
             (typeof process !== 'undefined' ? process.env[key] : null) || 
             (context.locals?.runtime?.env?.[key]);
    };

    const serverPasscode = getEnv('ADMIN_PASSCODE') || 'premium_chef';

    if (passcode === serverPasscode) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Passcode verified successfully' 
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Incorrect passcode' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid request data',
      details: error.message 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
