import type { ReactElement } from 'react';
import React, { useContext, useState } from 'react';
import { formToJson } from '../../lib/form';
import { Button, ButtonVariant } from '../buttons/Button';
import { TextField } from '../fields/TextField';
import type { CloseModalFunc } from '../modals/common';
import AuthHeader from './AuthHeader';
import type { AuthFormProps } from './common';
import { AuthModalText } from './common';
import { AuthFlow } from '../../lib/kratos';
import useAccountEmailFlow from '../../hooks/useAccountEmailFlow';
import { AuthEventNames } from '../../lib/auth';
import LogContext from '../../contexts/LogContext';
import AuthForm from './AuthForm';
import { KeyIcon } from '../icons';
import { useAuthData } from '../../contexts/AuthDataContext';

interface CodeVerificationFormProps extends AuthFormProps {
  initialFlow: string;
  onBack?: CloseModalFunc;
  onSubmit?: () => void;
}

function CodeVerificationForm({
  initialFlow,
  onBack,
  onSubmit,
  simplified,
}: CodeVerificationFormProps): ReactElement {
  const { email } = useAuthData();
  const { logEvent } = useContext(LogContext);
  const [hint, setHint] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const { sendEmail, verifyCode, resendTimer, isLoading } = useAccountEmailFlow(
    {
      flow: AuthFlow.Recovery,
      flowId: initialFlow,
      onTimerFinished: () => setEmailSent(false),
      onError: setHint,
      onSuccess: () => {
        setEmailSent(true);
      },
      onVerifyCodeSuccess: () => {
        onSubmit();
      },
    },
  );

  const onCodeVerification = async (e) => {
    e.preventDefault();
    logEvent({
      event_name: AuthEventNames.SubmitForgotPassword,
    });
    setHint('');
    const { code } = formToJson<{ code: string }>(e.currentTarget);
    await verifyCode({ code });
  };

  const onSendEmail = async () => {
    logEvent({
      event_name: AuthEventNames.SubmitForgotPassword,
    });
    await sendEmail(email);
  };

  return (
    <>
      <AuthHeader
        simplified={simplified}
        title="Verification"
        onBack={onBack}
      />
      <AuthForm
        className="flex flex-col items-end px-14 py-8"
        onSubmit={onCodeVerification}
        data-testid="recovery_form"
      >
        <AuthModalText className="text-center">
          We just sent the verification code to {email}
        </AuthModalText>
        <TextField
          aria-label="Verification code for password recovery"
          className={{ container: 'mt-6 w-full' }}
          name="code"
          type="code"
          inputId="code"
          label="Code"
          hint={hint}
          valid={!hint}
          onChange={() => hint && setHint('')}
          leftIcon={<KeyIcon aria-hidden role="presentation" />}
          autoFocus
        />
        <Button className="mt-6" variant={ButtonVariant.Primary} type="submit">
          Verify
        </Button>
        <Button
          className="w-30 mx-auto mt-6"
          variant={ButtonVariant.Secondary}
          onClick={onSendEmail}
          disabled={emailSent || isLoading}
        >
          {resendTimer === 0 ? 'Resend' : `${resendTimer}s`}
        </Button>
      </AuthForm>
    </>
  );
}

export default CodeVerificationForm;
