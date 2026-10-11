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

/**
 * Handles error reporter for the quality tooling.
 * Describes the error reporter data used by the quality tooling.
 */
export type ErrorReporter = (err: Error, report: { name: string; componentStack: string | null }) => void;
/**
 * Handles error boundary props for the quality tooling.
 * Describes the error boundary props data used by the quality tooling.
 */
export type ErrorBoundaryProps = { children?: React.ReactNode; fallback?: (err: Error) => React.ReactNode; name?: string; resetKey?: string; onError?: ErrorReporter };
/**
 * Handles error boundary state for the quality tooling.
 * Describes the error boundary state data used by the quality tooling.
 */
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
	/**
	 * Handles bounded component for the quality tooling.
	 *
	 * @param props Properties passed to the React error boundary.
	 *
	 * @return The boundedcomponent result used by the caller.
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
