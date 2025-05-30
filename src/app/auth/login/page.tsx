
"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, LogIn, UserPlus, KeyRound, BotMessageSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setError: setAuthError, error: authErrorFromContext } = useAuth(); // Use setError from auth context
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // To toggle between Login and Sign Up
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsSubmitting(true);
    setLocalError(null);
    setSuccessMessage(null);
    setAuthError(null); // Clear global auth error

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
        // User will be redirected by AuthProvider's onAuthStateChanged listener
        setSuccessMessage("Account created successfully! Redirecting...");
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        // User will be redirected by AuthProvider's onAuthStateChanged listener
        setSuccessMessage("Logged in successfully! Redirecting...");
      }
      // No need to router.push here, AuthProvider handles it
    } catch (err: any) {
      console.error(err);
      const message = err.message || (isSignUp ? "Failed to create account." : "Failed to log in.");
      setLocalError(message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!email) {
      setLocalError("Please enter your email address to reset password.");
      return;
    }
    setIsSubmitting(true);
    setLocalError(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      console.error(err);
      const message = err.message || "Failed to send password reset email.";
      setLocalError(message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setLocalError(null);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Redirect will be handled by AuthProvider
      setSuccessMessage("Logged in with Google successfully! Redirecting...");
    } catch (err: any)
     {
      console.error("Google Sign-In error:", err);
      const message = err.message || "Failed to sign in with Google.";
      setLocalError(message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
      setIsSubmitting(false);
    }
  };


  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
         <div className="flex justify-center items-center mb-4">
            <BotMessageSquare className="h-12 w-12 text-primary" />
         </div>
        <CardTitle className="text-3xl">{isSignUp ? 'Create Account' : 'Welcome Back!'}</CardTitle>
        <CardDescription>{isSignUp ? 'Enter your details to sign up.' : 'Log in to access SmartSpend AI CoPilot.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {localError && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}
        {authErrorFromContext && (
          <Alert variant="destructive">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{authErrorFromContext}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
            <AlertTitle className="text-green-700 dark:text-green-300">Success</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">{successMessage}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className={errors.password ? "border-destructive" : ""}
            />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSignUp ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />)}
            {isSignUp ? 'Sign Up' : 'Log In'}
          </Button>
        </form>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
          }
          Sign in with Google
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button variant="link" onClick={() => { setIsSignUp(!isSignUp); setLocalError(null); setSuccessMessage(null); reset(); }}>
          {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </Button>
        {!isSignUp && (
          <Button
            variant="link"
            size="sm"
            className="text-xs"
            onClick={() => {
              const email = (document.getElementById('email') as HTMLInputElement)?.value;
              handlePasswordReset(email);
            }}
            disabled={isSubmitting}
          >
            <KeyRound className="mr-1 h-3 w-3" /> Forgot Password?
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
