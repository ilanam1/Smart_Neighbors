import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

// Replace with your actual Supabase project URL and public anon key
const SUPABASE_URL = 'https://dlgxsnscubgpwvnuvoaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3hzbnNjdWJncHd2bnV2b2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODI5MjYsImV4cCI6MjA3OTk1ODkyNn0.wFLSIQCu8UiRWbxtUrFaWxSYLNhChEaKOD5jxyv258E';

let _client = null;

export function getSupabase() {
	if (_client) return _client;
	try {
		console.log('Creating supabase client (getSupabase)');
		_client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
		return _client;
	} catch (e) {
		console.error('Error creating supabase client in getSupabase:', e && e.message ? e.message : e);
		_client = null;
		return null;
	}
}

export default getSupabase;
