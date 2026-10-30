import { Component, type ReactNode } from "react";
import { Button, Result } from "antd";

type Props = { resetKey: string; children: ReactNode };
type State = { error: Error | null; resetKey: string };

/**
 * Last line of defence for a page: if anything inside it throws while
 * rendering (or its lazy chunk fails to load after a deploy), show an error
 * card in the content area instead of a blank white screen. The layout stays
 * usable, and navigating to another route (a new resetKey) clears the error.
 */
export default class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: unknown) {
    console.error("Page crashed:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Result
        status="error"
        title="Something went wrong on this page"
        subTitle={this.state.error.message || "An unexpected error occurred."}
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        }
      />
    );
  }
}
