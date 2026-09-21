/**
 * packages/error-boundaries/src/react.tsx
 * React error boundary and higher-order wrapper implementations.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// COMPONENTS
import React, { Component } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

export type ErrorReporter = (err: Error, report: { name: string; componentStack: string | null }) => void;
export type ErrorBoundaryProps = {
	children?: React.ReactNode;
	className?: string;
	'data-testid'?: string;
	fallback?: (err: Error) => React.ReactNode;
	name?: string;
	resetKey?: string;
	onError?: ErrorReporter;
};
export type ErrorBoundaryState = { error: Error | null };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Wraps a component in a named error boundary without coupling it to application UI.
 *
 * @param ComponentToWrap Component to render inside the error boundary.
 * @param name Stable name reported when the wrapped component fails.
 * @param onErr Optional callback that receives render errors and component metadata.
 *
 * @return A component with the same props that renders through an error boundary.
 */
export function withErrorBoundary<P extends object>(ComponentToWrap: React.ComponentType<P>, name: string, onErr?: ErrorReporter): React.ComponentType<P> {
	function BoundedComponent(props: P): React.JSX.Element {
		return (
			<ErrorBoundary name={name} onError={onErr}>
				<ComponentToWrap {...props} />
			</ErrorBoundary>
		);
	}
	BoundedComponent.displayName = `withErrorBoundary(${ComponentToWrap.displayName || ComponentToWrap.name || 'Component'})`;
	return BoundedComponent;
}

/** Catches render failures while keeping error reporting and fallback UI injectable. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null };
	static getDerivedStateFromError(err: Error): ErrorBoundaryState {
		return { error: err };
	}
	componentDidCatch(err: Error, info: React.ErrorInfo): void {
		this.props.onError?.(err, { name: this.props.name ?? 'Component', componentStack: info.componentStack ?? null });
	}
	componentDidUpdate(prev: ErrorBoundaryProps): void {
		if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
	}
	render(): React.ReactNode {
		const content = !this.state.error ? (
			this.props.children
		) : this.props.fallback ? (
			this.props.fallback(this.state.error)
		) : (
			<div role="alert">An unexpected error occurred while rendering this section.</div>
		);
		return this.props.className || this.props['data-testid'] ? (
			<div className={this.props.className} data-testid={this.props['data-testid']}>
				{content}
			</div>
		) : (
			content
		);
	}
}
