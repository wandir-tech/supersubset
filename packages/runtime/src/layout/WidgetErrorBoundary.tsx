import { Component, createElement, type ErrorInfo, type PropsWithChildren } from 'react';

interface WidgetErrorBoundaryProps {
  widgetId: string;
  title?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<
  PropsWithChildren<WidgetErrorBoundaryProps>,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Widget "${this.props.widgetId}" crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return createElement(
        'div',
        {
          className: 'ss-widget-error',
          style: {
            padding: '16px',
            color: '#cf1322',
            background: '#fff1f0',
            border: '1px solid #ffa39e',
            borderRadius: '8px',
            fontSize: '13px',
          },
        },
        createElement('strong', null, this.props.title ?? this.props.widgetId),
        createElement(
          'div',
          { style: { marginTop: '4px' } },
          `Widget error: ${this.state.error?.message ?? 'Unknown error'}`,
        ),
      );
    }
    return this.props.children;
  }
}
