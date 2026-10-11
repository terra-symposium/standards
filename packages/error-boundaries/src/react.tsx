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

/** Receives a render error and boundary metadata for application-owned logging. */
export type ErrorReporter = (err: Error, report: { name: string; componentStack: string | null }) => void;
/** Configuration and child content accepted by the reusable React error boundary. */
export type ErrorBoundaryProps = { children?: React.ReactNode; fallback?: (err: Error) => React.ReactNode; name?: string; resetKey?: string; onError?: ErrorReporter };
/** Internal React state containing the current descendant render error, if any. */
export type ErrorBoundaryState = { error: Error | null };

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/** Wraps a component in a named error boundary without coupling it to application UI.
 * @param ComponentToWrap Component to render inside the error boundary.
 * @param name Stable name reported when the wrapped component fails.
 * @param onErr Optional callback that receives render errors and component metadata.
 * @returns A component with the same props that renders through an error boundary.
 */
export function withErrorBoundary<P extends object>(ComponentToWrap: React.ComponentType<P>, name: string, onErr?: ErrorReporter): React.ComponentType<P> {
	/**
	 * Renders the wrapped component inside the configured boundary.
	 * @param props Props forwarded unchanged to the wrapped component.
	 * @returns The wrapped component as a React element under the error boundary.
	 */
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
		if (!this.state.error) return this.props.children;
		if (this.props.fallback) return this.props.fallback(this.state.error);
		return <div role="alert">An unexpected error occurred while rendering this section.</div>;
	}
}
