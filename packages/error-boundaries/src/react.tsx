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

/** Receives a render error and the component metadata needed for reporting. */
export type ErrorReporter = (err: Error, report: { name: string; componentStack: string | null }) => void;
/** Configurable inputs for the reusable React error boundary component. */
export type ErrorBoundaryProps = { children?: React.ReactNode; fallback?: (err: Error) => React.ReactNode; name?: string; resetKey?: string; onError?: ErrorReporter };
/** Props accepted by a component returned from `withErrorBoundary`. */
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
	/** Renders the wrapped component inside its configured error boundary.
	 * @param props Props forwarded to the wrapped component.
	 * @return The wrapped component rendered through the error boundary.
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
