'use client';
import { useEffect, useState, useReducer } from 'react';
import { io, Socket } from 'socket.io-client';

type SentinelEvent = {
  id: string;
  ip: string;
  category: string;
  status: string;
  score: number | null;
  summary: string | null;
  time: string;
};

type State = {
  events: SentinelEvent[];
  reviews: any[];
};

type Action = 
  | { type: 'SET_INITIAL'; payload: { events: any[]; reviews: any[] } }
  | { type: 'UPSERT_EVENT'; payload: SentinelEvent }
  | { type: 'ADD_REVIEW'; payload: any }
  | { type: 'REMOVE_REVIEW'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_INITIAL':
      return action.payload;
    case 'UPSERT_EVENT': {
      const idx = state.events.findIndex(e => e.id === action.payload.id);
      if (idx >= 0) {
        const newEvents = [...state.events];
        newEvents[idx] = action.payload;
        return { ...state, events: newEvents };
      }
      return { ...state, events: [action.payload, ...state.events] };
    }
    case 'ADD_REVIEW':
      if (state.reviews.some(r => r.id === action.payload.id)) return state;
      return { ...state, reviews: [action.payload, ...state.reviews] };
    case 'REMOVE_REVIEW':
      return { ...state, reviews: state.reviews.filter(r => r.id !== action.payload) };
    default:
      return state;
  }
}

export function useSentinelSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, dispatch] = useReducer(reducer, { events: [], reviews: [] });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Fetch initial data
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        dispatch({ type: 'SET_INITIAL', payload: data });
      })
      .catch(console.error);

    const socketInstance = io({ path: '/socket.io' });
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('event:flagged', (data) => {
      // Create new event in state
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId.toString(),
          ip: data.signal.ip,
          category: 'unknown',
          status: 'flagged',
          score: null,
          summary: null,
          time: 'Just now'
        }
      });
    });

    socketInstance.on('event:investigating', (data) => {
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId.toString(),
          ip: data.ip,
          category: 'unknown',
          status: 'investigating',
          score: null,
          summary: null,
          time: 'Just now'
        }
      });
    });

    socketInstance.on('event:judged', (data) => {
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId.toString(),
          ip: data.ip,
          category: data.category,
          status: 'judged',
          score: data.judgment?.confidenceScore || null,
          summary: data.investigation?.aiSummary || null,
          time: 'Just now'
        }
      });
    });

    socketInstance.on('event:needs_review', (data) => {
      // It's judged but needs review
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId.toString(),
          ip: data.ip,
          category: data.category,
          status: 'judged',
          score: data.judgment.confidenceScore,
          summary: data.investigation.aiSummary,
          time: 'Just now'
        }
      });
      
      dispatch({
        type: 'ADD_REVIEW',
        payload: {
          id: data.eventId.toString(),
          ip: data.ip,
          score: data.judgment.confidenceScore,
          reason: data.judgment.reasoning,
          time: 'Just now'
        }
      });
    });

    socketInstance.on('event:responded', (data) => {
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId.toString(),
          ip: data.ip,
          category: data.category,
          status: 'responded',
          score: data.score,
          summary: data.summary,
          time: 'Just now'
        }
      });
      dispatch({ type: 'REMOVE_REVIEW', payload: data.eventId.toString() });
    });

    socketInstance.on('event:closed', (data) => {
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId.toString(),
          ip: data.ip,
          category: data.category,
          status: 'closed',
          score: data.score,
          summary: data.summary,
          time: 'Just now'
        }
      });
      dispatch({ type: 'REMOVE_REVIEW', payload: data.eventId.toString() });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { state, isConnected, dispatch };
}
