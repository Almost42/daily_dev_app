import type { ReactElement } from 'react';
import React from 'react';
import type { IconProps } from '../../Icon';
import Icon from '../../Icon';
import FilledIcon from './filled.svg';

export const SparkleIcon = (props: IconProps): ReactElement => (
  <Icon {...props} IconPrimary={FilledIcon} IconSecondary={FilledIcon} />
);
