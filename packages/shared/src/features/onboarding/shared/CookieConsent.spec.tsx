import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { CookieConsent } from './CookieConsent';
import { LazyModal } from '../../../components/modals/common/types';
import {
  cookieAcknowledgedKey,
  GdprConsentKey,
  useCookieBanner,
} from '../../../hooks/useCookieBanner';
import { expireCookie, getCookies } from '../../../lib/cookie';
import { TestBootProvider } from '../../../../__tests__/helpers/boot';
import { nextTick } from '../../../lib/func';
import loggedUser from '../../../../__tests__/fixture/loggedUser';
import { MODAL_KEY } from '../../../hooks/useLazyModal';
import type { AuthContextData } from '../../../contexts/AuthContext';

let client: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient();
  localStorage.clear();
  document.cookie = '';
  Object.values(GdprConsentKey).forEach((key) => {
    expireCookie(key);
  });
});

const WrapperComponent = () => {
  const { showBanner, onAcceptCookies } = useCookieBanner();

  if (!showBanner) {
    return null;
  }

  return (
    <CookieConsent
      onAccepted={onAcceptCookies}
      onHideBanner={jest.fn()}
      onModalClose={jest.fn()}
    />
  );
};

const renderComponent = (auth: Partial<AuthContextData> = {}) => {
  return render(
    <TestBootProvider client={client} auth={auth}>
      <WrapperComponent />
    </TestBootProvider>,
  );
};

describe('Onboarding CookieConsent outside GDPR', () => {
  it('should render just a single button to accept all when outside GDPR coverage', async () => {
    renderComponent();
    await nextTick();
    const el = await screen.findByText('I understand');
    expect(el.tagName).toBe('BUTTON');
  });

  it('should not render when cookie is accepted already', async () => {
    document.cookie = `${GdprConsentKey.Necessary}=true`;
    renderComponent();

    await nextTick();
    const banner = screen.queryByTestId('cookie_content');
    expect(banner).not.toBeInTheDocument();
  });

  it('should set the necessary cookies "I understand" is clicked', async () => {
    renderComponent();

    await screen.findByTestId('cookie_content');
    const button = await screen.findByText('I understand');
    await act(() => fireEvent.click(button));
    await nextTick();
    const cookies = getCookies([GdprConsentKey.Necessary]);
    expect(cookies.ilikecookies).toEqual('true');
  });
});

describe('Onboarding CookieConsent under GDPR', () => {
  const renderWrapper = async (auth: Partial<AuthContextData> = {}) => {
    renderComponent({ ...auth, isGdprCovered: true });
    await nextTick();
  };

  it('should render two buttons to either accept or customize', async () => {
    await renderWrapper();

    await screen.findByText('Accept all');
    await screen.findByText('Customize');
  });

  it('should not render when cookie is accepted already as anonymous user', async () => {
    document.cookie = `${GdprConsentKey.Necessary}=true`;
    await renderWrapper();

    const banner = screen.queryByTestId('cookie_content');
    expect(banner).not.toBeInTheDocument();
  });

  it('should render when cookie necessary is only accepted as logged in user', async () => {
    document.cookie = `${GdprConsentKey.Necessary}=true`;
    await renderWrapper({ user: loggedUser });

    await screen.findByTestId('cookie_content');
  });

  it('should not render when logged user interacted with the consent banner', async () => {
    document.cookie = `${GdprConsentKey.Necessary}=true`;
    localStorage.setItem(cookieAcknowledgedKey, 'true');
    await renderWrapper({ user: loggedUser });

    const banner = screen.queryByTestId('cookie_content');
    expect(banner).not.toBeInTheDocument();
  });

  it('should not render close button', async () => {
    await renderWrapper();

    const button = screen.queryByTitle('Close');
    expect(button).not.toBeInTheDocument();
  });

  it('should set the cookies for all when accept all is clicked', async () => {
    await renderWrapper();

    await screen.findByTestId('cookie_content');
    const button = await screen.findByText('Accept all');
    await act(() => fireEvent.click(button));
    await nextTick();
    const cookies = getCookies([
      GdprConsentKey.Necessary,
      GdprConsentKey.Marketing,
    ]);
    expect(cookies.ilikecookies).toEqual('true');
    expect(cookies.ilikecookies_marketing).toEqual('true');
  });

  it('should open the modal for detailed consent', async () => {
    await renderWrapper();

    await screen.findByTestId('cookie_content');
    const button = await screen.findByText('Customize');
    await act(() => fireEvent.click(button));
    await nextTick();
    const modal = client.getQueryData(MODAL_KEY);
    expect((modal as { type: string }).type).toEqual(LazyModal.CookieConsent);
  });
});
