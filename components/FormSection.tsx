import React from 'react';

type Props = {
  title: string;
  description?: string;
  iconClass?: string; // e.g. "fa-solid fa-user"
  iconColor?: string;
  className?: string;
  children: React.ReactNode;
};

const FormSection: React.FC<Props> = ({
  title,
  description,
  iconClass,
  iconColor,
  className,
  children,
}) => {
  return (
    <section className={`space-y-3 ${className || ''}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {iconClass ? (
              <i className={iconClass} style={iconColor ? { color: iconColor } : undefined} />
            ) : null}
            <h3 className="app-section-title truncate">{title}</h3>
          </div>
          {description ? <div className="app-subtle mt-1">{description}</div> : null}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
};

export default FormSection;
