export const prerender = false;

export const POST = async ({ request }) => {
  try {
    const { passcode } = await request.json();
    
    // Check if passcode is set via environment variables, otherwise fallback to default
    const serverPasscode = import.meta.env.ADMIN_PASSCODE || 'premium_chef';

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
