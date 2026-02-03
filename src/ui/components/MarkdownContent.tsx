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
            containerRef.current.empty();
            void MarkdownRenderer.render(
                app,
                content,
                containerRef.current,
                sourcePath,
                componentRef.current
            );
        }

        // No cleanup needed for render as it appends to the element, 
        // but if we used addChild we might need it. 
        // Component lifecycle is handled by the ephemeral componentRef.
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
