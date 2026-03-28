import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { isSelfHealEnabledFromSearch, type StatusUpdate } from '@ralphthon/self-heal-runtime';

import { appendOperatorLog, formatDetails, type OperatorLogEntry } from './operatorLog';
import { discoverDemoActions, type DemoActionOverrides } from './discoverActions';
import { createDemoActionCatalog, type CreateNotePatchRequest, type DemoActionCatalog } from './runtimeClient';

interface DemoSelfHealContextValue {
  actions: DemoActionCatalog;
  currentStatus: StatusUpdate | null;
  operatorLog: OperatorLogEntry[];
  enabled: boolean;
  reportOperatorError: (message: string, details?: unknown) => void;
}

interface DemoSelfHealProviderProps {
  children: ReactNode;
  initialUrlSearch?: string;
  requestPatch?: CreateNotePatchRequest;
  actionOverrides?: DemoActionOverrides;
}

const DemoSelfHealContext = createContext<DemoSelfHealContextValue | null>(null);

export function DemoSelfHealProvider({
  children,
  initialUrlSearch,
  requestPatch,
  actionOverrides
}: DemoSelfHealProviderProps) {
  const enabled = isSelfHealEnabledFromSearch(initialUrlSearch ?? window.location.search);
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate | null>(null);
  const [operatorLog, setOperatorLog] = useState<OperatorLogEntry[]>([]);

  const pushOperatorLog = useCallback((level: OperatorLogEntry['level'], message: string, details?: unknown) => {
    setOperatorLog((entries) =>
      appendOperatorLog(entries, {
        level,
        message,
        details: formatDetails(details)
      })
    );
  }, []);

  const actions = useMemo(
    () =>
      createDemoActionCatalog(
        {
          enabled,
          requestPatch,
          onStatusChange: (update) => {
            setCurrentStatus(update);
            if (update.status === 'retrying') {
              pushOperatorLog('info', `Retrying ${update.actionId} once.`, 'Automatic retry is limited to a single attempt.');
            }
          },
          onPatchApplied: (patch) => {
            pushOperatorLog('info', `Installed transient hotfix for ${patch.actionId}.`, patch.rationale ?? 'Patch installed without rationale.');
          },
          onDiagnostic: (message, details) => {
            pushOperatorLog('error', message, details);
          }
        },
        discoverDemoActions(actionOverrides)
      ),
    [actionOverrides, enabled, pushOperatorLog, requestPatch]
  );

  const value = useMemo<DemoSelfHealContextValue>(
    () => ({
      actions,
      currentStatus,
      operatorLog,
      enabled,
      reportOperatorError: (message, details) => {
        pushOperatorLog('error', message, details);
      }
    }),
    [actions, currentStatus, enabled, operatorLog, pushOperatorLog]
  );

  return <DemoSelfHealContext.Provider value={value}>{children}</DemoSelfHealContext.Provider>;
}

export function useDemoSelfHeal(): DemoSelfHealContextValue {
  const context = useContext(DemoSelfHealContext);

  if (!context) {
    throw new Error('useDemoSelfHeal must be used inside DemoSelfHealProvider.');
  }

  return context;
}
