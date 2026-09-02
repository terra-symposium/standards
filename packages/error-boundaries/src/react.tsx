import React, { Component } from 'react';

export type ErrorReport = {
	name: string;
	componentStack: string | null;
};

export type ErrorReporter = (error: Error, report: ErrorReport) => void;

export type ErrorBoundaryProps = {
	children?: React.ReactNode;
	fallback?: (error: Error) => React.ReactNode;
	name?: string;
	resetKey?: string;
	onError?: ErrorReporter;
};

export type ErrorBoundaryState = {
	error: Error | null;
};

/** Catches render failures while keeping error reporting and fallback UI injectable. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo): void {
		this.props.onError?.(error, {
			name: this.props.name ?? 'Component',
			componentStack: info.componentStack ?? null,
		});
	}

	componentDidUpdate(previous: ErrorBoundaryProps): void {
		if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
	}

	render(): React.ReactNode {
		if (!this.state.error) return this.props.children;
		if (this.props.fallback) return this.props.fallback(this.state.error);
		return <div role='alert'>An unexpected error occurred while rendering this section.</div>;
	}
}

/** Wraps a component in a named error boundary without coupling it to application UI. */
export function withErrorBoundary<P extends object>(ComponentToWrap: React.ComponentType<P>, name: string, onError?: ErrorReporter): React.ComponentType<P> {
	function BoundedComponent(props: P): React.JSX.Element {
		return (
			<ErrorBoundary name={name} onError={onError}>
				<ComponentToWrap {...props} />
			</ErrorBoundary>
		);
	}
	BoundedComponent.displayName = `withErrorBoundary(${ComponentToWrap.displayName || ComponentToWrap.name || 'Component'})`;
	return BoundedComponent;
}
