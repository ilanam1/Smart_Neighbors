import React from 'react';
import AuthScreen from './AuthScreen';

export default function SignupScreen(props) {
  return <AuthScreen {...props} initialMode="signup" />;
}
