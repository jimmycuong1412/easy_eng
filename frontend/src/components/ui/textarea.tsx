import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    'flex min-h-[80px] w-full rounded-lg border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-primary',
                    'placeholder:text-text-muted',
                    'transition-all duration-200 ease-out-expo',
                    'focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Textarea.displayName = 'Textarea';

export { Textarea };
