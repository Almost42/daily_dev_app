import React, { CSSProperties, ReactElement } from 'react';
import cloneDeep from 'lodash.clonedeep';
// import TwitterIcon from '../icons/Twitter';
import FacebookIcon from '../icons/Facebook';
import GoogleIcon from '../icons/Google';
import GitHubIcon from '../icons/GitHub';
import AppleIcon from '../icons/Apple';
import classed from '../../lib/classed';
import { IconType } from '../buttons/Button';
import DiscardActionModal from '../modals/DiscardActionModal';
import { CloseModalFunc } from '../modals/common';

export interface Provider {
  icon: IconType;
  provider: string;
  onClick?: () => unknown;
  className?: string;
  style?: CSSProperties;
}

enum SocialProvider {
  // Twitter = 'twitter',
  Facebook = 'facebook',
  Google = 'google',
  GitHub = 'github',
  Apple = 'apple',
}

type ProviderMap = Record<SocialProvider, Provider>;

export const providerMap: ProviderMap = {
  // twitter: {
  //   icon: <TwitterIcon />,
  //   provider: 'Twitter',
  //   style: { backgroundColor: '#1D9BF0' },
  // },
  facebook: {
    icon: <FacebookIcon className="socialIcon" />,
    provider: 'Facebook',
    style: { backgroundColor: '#4363B6' },
  },
  google: {
    icon: <GoogleIcon className="socialIcon" secondary />,
    provider: 'Google',
    style: { backgroundColor: '#FFFFFF', color: '#0E1217' },
  },
  github: {
    icon: <GitHubIcon className="socialIcon" />,
    provider: 'GitHub',
    style: { backgroundColor: '#2D313A' },
  },
  apple: {
    icon: <AppleIcon className="socialIcon" />,
    provider: 'Apple',
    style: { backgroundColor: '#0E1217' },
  },
};

export const getProviderMapClone = (
  map: ProviderMap = providerMap,
): ProviderMap => cloneDeep(map);

export const providers: Provider[] = Object.values(providerMap);

export const AuthModalText = classed(
  'p',
  'typo-body text-theme-label-secondary',
);

interface DiscardAuthProps {
  onContinue: CloseModalFunc;
  onExit: CloseModalFunc;
  container?: HTMLElement;
  isOpen: boolean;
}

export const DiscardAuthModal = ({
  container,
  onContinue,
  onExit,
  isOpen,
}: DiscardAuthProps): ReactElement => (
  <DiscardActionModal
    isOpen={isOpen}
    rightButtonAction={onContinue}
    leftButtonAction={onExit}
    parentSelector={() => container}
    onRequestClose={onContinue}
    title="Discard changes?"
    description="If you leave your changes will not be saved"
    leftButtonText="Leave"
    rightButtonText="Stay"
    rightButtonClass="btn-primary-cabbage"
  />
);
