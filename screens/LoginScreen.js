import React from 'react';
import AuthScreen from './AuthScreen';

export default function LoginScreen(props) {
  return <AuthScreen {...props} initialMode="signin" />;
}
