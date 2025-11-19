import { PUBLIC_API_BASE_URL } from '$env/static/public';

export const API_BASE_URL = PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8080';
