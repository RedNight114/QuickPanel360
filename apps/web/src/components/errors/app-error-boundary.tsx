'use client';

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { GlobalErrorScreen } from './global-error-screen';

type Props = {
  children: ReactNode;
  title?: string;
  message?: string;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('AppErrorBoundary', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <GlobalErrorScreen
          title={this.props.title}
          message={this.props.message}
          onRetry={this.handleRetry}
          showTechnicalDetails={process.env.NODE_ENV !== 'production'}
          technicalDetails={this.state.error.stack ?? this.state.error.message}
        />
      );
    }

    return this.props.children;
  }
}
