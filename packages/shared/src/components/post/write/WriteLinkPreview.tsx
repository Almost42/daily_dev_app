import React, { ReactElement } from 'react';
import { TextField } from '../../fields/TextField';
import LinkIcon from '../../icons/Link';
import { SourceAvatar } from '../../profile/source';
import { Image } from '../../image/Image';
import { Button } from '../../buttons/Button';
import OpenLinkIcon from '../../icons/OpenLink';
import {
  previewImageClass,
  WritePreviewContainer,
  WritePreviewContent,
} from './common';
import { ExternalLinkPreview } from '../../../graphql/posts';

interface WriteLinkPreviewProps {
  link: string;
  preview: ExternalLinkPreview;
}

export function WriteLinkPreview({
  link,
  preview,
}: WriteLinkPreviewProps): ReactElement {
  return (
    <WritePreviewContainer>
      <TextField
        leftIcon={<LinkIcon />}
        label="URL"
        type="url"
        inputId="preview_url"
        fieldType="tertiary"
        className={{ container: 'w-full' }}
        value={link}
      />
      <WritePreviewContent>
        <div className="flex flex-col flex-1 typo-footnote">
          <span className="font-bold line-clamp-2">{preview.title}</span>
          {preview.source && (
            <span className="flex flex-row items-center mt-1">
              <SourceAvatar size="small" source={preview.source} />
              <span className="text-theme-label-tertiary">
                {preview.source.name}
              </span>
            </span>
          )}
        </div>
        <Image className={previewImageClass} src={preview.image} />
        <Button
          icon={<OpenLinkIcon />}
          className="btn-tertiary"
          type="button"
          tag="a"
          target="_blank"
          rel="noopener noreferrer"
          href={link}
        />
      </WritePreviewContent>
    </WritePreviewContainer>
  );
}
