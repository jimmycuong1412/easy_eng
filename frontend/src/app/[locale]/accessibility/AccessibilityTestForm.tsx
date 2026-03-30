'use client';

import { Button } from '@/components/ui/button';

export default function AccessibilityTestForm() {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      {/* Text Input */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-1">
          Username <span aria-label="required" className="text-error">*</span>
        </label>
        <input
          type="text"
          id="username"
          name="username"
          required
          aria-required="true"
          aria-describedby="username-hint"
          className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <p id="username-hint" className="text-sm text-text-secondary mt-1">
          Choose a unique username (3-20 characters)
        </p>
      </div>

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
          Email Address <span aria-label="required" className="text-error">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          aria-required="true"
          aria-describedby="email-hint"
          className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <p id="email-hint" className="text-sm text-text-secondary mt-1">
          We&apos;ll never share your email with anyone else
        </p>
      </div>

      {/* Checkbox */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="terms"
          name="terms"
          required
          aria-required="true"
          aria-describedby="terms-description"
          className="mt-1 w-4 h-4 text-accent-primary bg-bg-primary border-border-primary rounded focus:ring-2 focus:ring-accent-primary"
        />
        <div className="flex-1">
          <label htmlFor="terms" className="text-sm font-medium text-text-primary">
            I agree to the Terms and Conditions
          </label>
          <p id="terms-description" className="text-xs text-text-secondary mt-1">
            By checking this box, you agree to our terms of service
          </p>
        </div>
      </div>

      {/* Radio Group */}
      <fieldset>
        <legend className="text-sm font-medium text-text-primary mb-2">
          Select your role
        </legend>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="role-student"
              name="role"
              value="student"
              className="w-4 h-4 text-accent-primary focus:ring-2 focus:ring-accent-primary"
            />
            <label htmlFor="role-student" className="text-sm text-text-primary">
              Student
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="role-teacher"
              name="role"
              value="teacher"
              className="w-4 h-4 text-accent-primary focus:ring-2 focus:ring-accent-primary"
            />
            <label htmlFor="role-teacher" className="text-sm text-text-primary">
              Teacher
            </label>
          </div>
        </div>
      </fieldset>

      <Button type="submit" aria-label="Submit registration form">
        Submit Form
      </Button>
    </form>
  );
}
