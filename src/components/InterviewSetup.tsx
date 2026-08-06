import React, { useState, useCallback } from 'react';
import { Zap, Brain, AlertCircle, CheckCircle, Sun, Moon } from 'lucide-react';
import { InterviewContext } from '../types/agent';
import { useTheme } from '../hooks/useTheme';
import { validateInput, sanitizeInput, VALIDATION_RULES } from '../utils/validation';
import { logger } from '../utils/secureLogger';

interface InterviewSetupProps {
  onStart: (context: InterviewContext) => void;
}

interface ValidationState {
  companyName: string;
  roleTitle: string;
  interviewers: string;
}

export function InterviewSetup({ onStart }: InterviewSetupProps) {
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [interviewers, setInterviewers] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ValidationState>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const validateField = useCallback((field: keyof ValidationState, value: string): boolean => {
    const newErrors = { ...errors };
    let isValid = true;

    try {
      if (field === 'companyName') {
        const result = validateInput(value, VALIDATION_RULES.companyName);
        if (!result.valid) {
          newErrors.companyName = result.error || 'Invalid company name';
          isValid = false;
        } else {
          delete newErrors.companyName;
        }
      }

      if (field === 'roleTitle') {
        const result = validateInput(value, VALIDATION_RULES.roleTitle);
        if (!result.valid) {
          newErrors.roleTitle = result.error || 'Invalid role title';
          isValid = false;
        } else {
          delete newErrors.roleTitle;
        }
      }

      if (field === 'interviewers') {
        const names = value.split(',').map(n => n.trim()).filter(n => n);

        // Interviewer names are helpful context, but they may not be known yet.
        if (names.length === 0) {
          delete newErrors.interviewers;
        } else {
          const invalidNames = names.filter(n => {
            const result = validateInput(n, VALIDATION_RULES.interviewer);
            return !result.valid;
          });

          if (invalidNames.length > 0) {
            newErrors.interviewers = 'Each interviewer name must be 2-100 characters';
            isValid = false;
          } else {
            delete newErrors.interviewers;
          }
        }
      }
    } catch (error) {
      logger.error('Validation error', error as Error);
      newErrors[field] = 'Validation failed';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [errors]);

  const handleFieldChange = useCallback((field: keyof ValidationState, value: string) => {
    if (field === 'companyName') setCompanyName(value);
    if (field === 'roleTitle') setRoleTitle(value);
    if (field === 'interviewers') setInterviewers(value);

    if (hasSubmitted) {
      validateField(field, value);
    }
  }, [hasSubmitted, validateField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    const isCompanyValid = validateField('companyName', companyName);
    const isRoleValid = validateField('roleTitle', roleTitle);
    const isInterviewersValid = validateField('interviewers', interviewers);

    if (!isCompanyValid || !isRoleValid || !isInterviewersValid) {
      return;
    }

    const sanitizedCompany = sanitizeInput(companyName);
    const sanitizedRole = sanitizeInput(roleTitle);
    const interviewerNames = interviewers
      .split(',')
      .map(name => sanitizeInput(name.trim()))
      .filter(name => name);

    setIsLoading(true);
    try {
      logger.info('Interview setup initiated', {
        company: sanitizedCompany,
        role: sanitizedRole,
        interviewerCount: interviewerNames.length,
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      onStart({
        companyName: sanitizedCompany,
        roleTitle: sanitizedRole,
        interviewerNames,
        currentPhase: 'opening',
        totalQuestionsAsked: 0,
      });
    } catch (error) {
      logger.error('Setup submission failed', error as Error);
      setIsLoading(false);
    }
  };

  const isFormValid = companyName.trim() && roleTitle.trim();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isFormValid) {
      handleSubmit(e as any);
    }
  }, [isFormValid, handleSubmit]);

  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-6">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-2 hover:bg-gray-700 rounded-lg transition-colors"
        aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Current: ${effectiveTheme} mode`}
      >
        {effectiveTheme === 'dark' ? (
          <Sun className="w-6 h-6 text-yellow-400" />
        ) : (
          <Moon className="w-6 h-6 text-indigo-400" />
        )}
      </button>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold">Agentic Interview Assistant</h1>
          </div>
          <p className="text-xl text-gray-400 max-w-xl mx-auto">
            Get calm, real-time support during your interview. Add the details you know now—you can leave interviewer names blank.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-xs font-medium text-gray-400" aria-label="Setup progress">
            <span className="flex items-center gap-2 text-blue-300"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">1</span> Setup</span>
            <span className="h-px w-10 bg-gray-600" />
            <span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-600">2</span> Interview</span>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {[
            {
              icon: '🎯',
              title: 'Intent Prediction',
              desc: 'Predicts questions before they finish',
            },
            {
              icon: '🧠',
              title: 'Adaptive Strategy',
              desc: 'Adjusts approach in real-time',
            },
            {
              icon: '⚡',
              title: 'Autonomous Actions',
              desc: 'Auto-generates answers & suggestions',
            },
            {
              icon: '💾',
              title: 'Memory System',
              desc: 'Learns & improves continuously',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-600 transition-colors"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <div className="font-semibold text-sm mb-1">{feature.title}</div>
              <div className="text-xs text-gray-400">{feature.desc}</div>
            </div>
          ))}
        </div>

        {/* Setup Form */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="bg-gray-800 rounded-lg border border-gray-700 p-8"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Interview setup
            </h2>
            <p className="text-sm text-gray-400 mt-2">Tell Jarvis what you know. Only the company and role are required.</p>
          </div>

          <div className="space-y-5">
            {/* Company Name */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                Company Name
              </label>
              <div className="relative">
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={e => handleFieldChange('companyName', e.target.value)}
                  onBlur={() => validateField('companyName', companyName)}
                  placeholder="e.g., Microsoft, Google, Meta"
                  aria-invalid={!!errors.companyName}
                  aria-describedby={errors.companyName ? 'company-error' : 'company-hint'}
                  className={`w-full px-4 py-2.5 bg-gray-700 border rounded text-white placeholder-gray-400 focus:outline-none transition-colors ${
                    errors.companyName
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-gray-600 focus:border-blue-500'
                  }`}
                />
                {companyName && !errors.companyName && (
                  <CheckCircle className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.companyName ? (
                <p id="company-error" className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.companyName}
                </p>
              ) : (
                <p id="company-hint" className="text-xs text-gray-400 mt-1">
                  The company you're interviewing with
                </p>
              )}
            </div>

            {/* Role Title */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                Role Title
              </label>
              <div className="relative">
                <input
                  id="role"
                  type="text"
                  value={roleTitle}
                  onChange={e => handleFieldChange('roleTitle', e.target.value)}
                  onBlur={() => validateField('roleTitle', roleTitle)}
                  placeholder="e.g., Senior Software Engineer, Product Manager"
                  aria-invalid={!!errors.roleTitle}
                  aria-describedby={errors.roleTitle ? 'role-error' : 'role-hint'}
                  className={`w-full px-4 py-2.5 bg-gray-700 border rounded text-white placeholder-gray-400 focus:outline-none transition-colors ${
                    errors.roleTitle
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-gray-600 focus:border-blue-500'
                  }`}
                />
                {roleTitle && !errors.roleTitle && (
                  <CheckCircle className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.roleTitle ? (
                <p id="role-error" className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.roleTitle}
                </p>
              ) : (
                <p id="role-hint" className="text-xs text-gray-400 mt-1">
                  The position you're interviewing for
                </p>
              )}
            </div>

            {/* Interviewer Names */}
            <div>
              <label htmlFor="interviewers" className="block text-sm font-medium text-gray-300 mb-2">
                Interviewer Names
              </label>
              <div className="relative">
                <input
                  id="interviewers"
                  type="text"
                  value={interviewers}
                  onChange={e => handleFieldChange('interviewers', e.target.value)}
                  onBlur={() => validateField('interviewers', interviewers)}
                  placeholder="e.g., John Smith, Sarah Johnson, Mike Chen"
                  aria-invalid={!!errors.interviewers}
                  aria-describedby={errors.interviewers ? 'interviewers-error' : 'interviewers-hint'}
                  className={`w-full px-4 py-2.5 bg-gray-700 border rounded text-white placeholder-gray-400 focus:outline-none transition-colors ${
                    errors.interviewers
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-gray-600 focus:border-blue-500'
                  }`}
                />
                {interviewers && !errors.interviewers && (
                  <CheckCircle className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.interviewers ? (
                <p id="interviewers-error" className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.interviewers}
                </p>
              ) : (
                <p id="interviewers-hint" className="text-xs text-gray-400 mt-1">
                  Optional. Add names separated by commas if you know them
                </p>
              )}
            </div>
          </div>

          {/* Capabilities List */}
          <div className="mt-8 p-4 bg-gray-700 rounded border border-gray-600">
            <p className="text-sm font-medium text-gray-300 mb-3">
              Agent capabilities:
            </p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>✓ Real-time question prediction</li>
              <li>✓ Automatic answer generation</li>
              <li>✓ Dynamic strategy adaptation</li>
              <li>✓ Interviewer profiling</li>
              <li>✓ Talking points suggestion</li>
              <li>✓ One-click answer copying</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className={`w-full mt-8 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              isLoading || !isFormValid
                ? 'bg-gray-600 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
            }`}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Initializing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Start Interview Assistant
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Required fields are marked by the button becoming available · Press Ctrl+Enter to start
          </p>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            Powered by advanced AI agents with autonomous decision-making
          </p>
        </div>
      </div>
    </div>
  );
}
