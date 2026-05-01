import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    private handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-primary/20 text-text-primary p-6">
                    <div className="bg-bg-secondary p-8 rounded-xl shadow-lg border border-border-color max-w-lg w-full text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-danger-color/10 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-danger-color" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-text-primary mb-2">Oops! Algo deu errado.</h1>
                            <p className="text-text-secondary text-sm">
                                A aplicação encontrou um erro inesperado. Pedimos desculpas pelo inconveniente.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-bg-primary p-4 rounded-md border border-border-color/50 overflow-x-auto text-left">
                                <p className="text-danger-color font-mono text-xs break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-center gap-4 pt-4">
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-4 py-2 bg-bg-primary hover:bg-hover-bg border border-border-color rounded-md transition-colors text-sm"
                            >
                                <Home className="w-4 h-4" />
                                Início
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-4 py-2 bg-info-color hover:bg-info-color/80 text-white border border-transparent rounded-md transition-colors text-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Recarregar
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
