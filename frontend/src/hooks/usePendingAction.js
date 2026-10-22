import { useRef, useState } from 'react';

export function usePendingAction() {
    const pendingKeysRef = useRef(new Set());
    const [, setVersion] = useState(0);

    function sync() {
        setVersion((value) => value + 1);
    }

    function isPending(key) {
        return pendingKeysRef.current.has(key);
    }

    async function runPending(key, operation) {
        if (pendingKeysRef.current.has(key)) {
            return null;
        }

        pendingKeysRef.current.add(key);
        sync();

        try {
            return await operation();
        } finally {
            pendingKeysRef.current.delete(key);
            sync();
        }
    }

    return {
        isPending,
        runPending,
        hasPending: pendingKeysRef.current.size > 0,
    };
}
