'use client';

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { Card } from '@/components/ui/card';

type Props = {
  children: ReactNode;
  title?: string;
  message?: string;
  compact?: boolean;
};

type State = {
  error: Error | null;
};

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('SectionErrorBoundary', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Card className={this.props.compact ? 'p-3' : 'p-5'}>
          <ErrorState
            title={this.props.title ?? 'No se pudo cargar esta sección'}
            message={this.props.message ?? 'Inténtalo de nuevo dentro de unos segundos.'}
            onRetry={this.handleRetry}
          />
        </Card>
      );
    }

    return this.props.children;
  }
}
