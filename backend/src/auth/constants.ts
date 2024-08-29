// Use environment variables for sensitive data
export const jwtConstants = {
	secret: process.env.JWT_SECRET || 'default_secret', // Replace 'default_secret' with your actual secret
};
  