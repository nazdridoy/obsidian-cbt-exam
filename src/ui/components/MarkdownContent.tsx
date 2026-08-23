import * as React from "react";
import { App, MarkdownRenderer, Component } from "obsidian";

interface MarkdownContentProps {
    content: string;
    app: App;
    sourcePath?: string;
    tagName?: 'div' | 'span';
    className?: string;
    style?: React.CSSProperties;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
    content,
    app,
    sourcePath = "",
    tagName = "div",
    className = "",
    style = {}
}) => {
    const containerRef = React.useRef<HTMLElement>(null);
    const componentRef = React.useRef<Component>(new Component());

    React.useEffect(() => {
        if (containerRef.current) {
            const container = containerRef.current;
            const effectiveSourcePath = sourcePath || app.workspace.getActiveFile()?.path || '';
            const handleInternalLinkClick = (event: MouseEvent) => {
                const target = event.target;
                const link = target instanceof Element ? target.closest<HTMLAnchorElement>('a.internal-link') : null;
                if (!link || !container.contains(link)) return;
                const linkText = link.getAttribute('data-href') || link.getAttribute('href');
                if (!linkText) return;
                event.preventDefault();
                event.stopPropagation();
                void app.workspace.openLinkText(linkText, effectiveSourcePath, true);
            };

            container.empty();
            container.addEventListener('click', handleInternalLinkClick);
            void MarkdownRenderer.render(
                app,
                content,
                container,
                effectiveSourcePath,
                componentRef.current
            );
            return () => container.removeEventListener('click', handleInternalLinkClick);
        }
    }, [content, app, sourcePath]);

    const Tag = tagName as React.ElementType;

    return (
        <Tag
            ref={containerRef}
            className={`markdown-preview-view ${className}`}
            style={style}
        />
    );
};
