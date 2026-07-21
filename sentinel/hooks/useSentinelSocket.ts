'use client';
import { useEffect, useState, useReducer } from 'react';
import { io, Socket } from 'socket.io-client';

export type SentinelEvent = {
  id: string;
  ip: string;
  category: string;
  status: string;
  score: number | null;
  summary: string | null;
  time: string;
  createdAt?: string;
  severity?: string;
  mitre_technique?: string;
  abuseIpdbResult?: any;
  virusTotalResult?: any;
  greyNoiseResult?: any;
  evidence?: string[];
  aptCorrelation?: any;
  recommended_action?: string;
  reasoning?: string;
  plainEnglishSummary?: string;
  actionTaken?: string;
  target_asset?: any;
  protocol?: string;
  payloadSummary?: string;
  reasonCode?: string;
};

export type PipelineStage = 'idle' | 'correlator' | 'watcher' | 'investigator' | 'investigator_done' | 'judge' | 'judge_done' | 'responder' | 'record';

type State = {
  events: SentinelEvent[];
  reviews: any[];
  activeEventId: string | null;
  pipelineStage: PipelineStage;
  pipelineData: any;
};

type Action =
  | { type: 'SET_INITIAL'; payload: { events: any[]; reviews: any[] } }
  | { type: 'UPSERT_EVENT'; payload: SentinelEvent }
  | { type: 'ADD_REVIEW'; payload: any }
  | { type: 'REMOVE_REVIEW'; payload: string }
  | { type: 'SET_PIPELINE_STAGE'; payload: { stage: PipelineStage; eventId: string; data?: any } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_INITIAL':
      return { ...state, events: action.payload.events, reviews: action.payload.reviews };

    case 'UPSERT_EVENT': {
      const idx = state.events.findIndex(e => e.id === action.payload.id);
      if (idx >= 0) {
        const newEvents = [...state.events];
        newEvents[idx] = { ...newEvents[idx], ...action.payload };
        return { ...state, events: newEvents };
      }
      return { ...state, events: [action.payload, ...state.events] };
    }

    case 'ADD_REVIEW':
      if (state.reviews.some(r => r.id === action.payload.id)) return state;
      return { ...state, reviews: [action.payload, ...state.reviews] };

    case 'REMOVE_REVIEW':
      return { ...state, reviews: state.reviews.filter(r => r.id !== action.payload) };

    case 'SET_PIPELINE_STAGE':
      return {
        ...state,
        activeEventId: action.payload.eventId,
        pipelineStage: action.payload.stage,
        pipelineData: action.payload.data || null
      };

    default:
      return state;
  }
}

export function useSentinelSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, dispatch] = useReducer(reducer, {
    events: [],
    reviews: [],
    activeEventId: null,
    pipelineStage: 'idle',
    pipelineData: null
  });
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

    socketInstance.on('connect', () => setIsConnected(true));
    socketInstance.on('disconnect', () => setIsConnected(false));

    // Pipeline stage updates
    socketInstance.on('pipeline:stage', (data) => {
      dispatch({
        type: 'SET_PIPELINE_STAGE',
        payload: {
          stage: data.stage as PipelineStage,
          eventId: data.eventId?.toString(),
          data
        }
      });

      // Also update the event card based on stage
      if (data.stage === 'watcher' && data.ip) {
        dispatch({
          type: 'UPSERT_EVENT',
          payload: {
            id: data.eventId?.toString(),
            ip: data.ip,
            category: 'unknown',
            status: 'flagged',
            score: null,
            summary: null,
            time: 'Just now',
            reasonCode: data.reasonCode
          }
        });
      }

      if (data.stage === 'investigator_done' && data.investigation) {
        dispatch({
          type: 'UPSERT_EVENT',
          payload: {
            id: data.eventId?.toString(),
            ip: '',
            category: data.investigation.attackCategory || 'unknown',
            status: 'investigating',
            score: null,
            summary: data.investigation.aiSummary,
            time: 'Just now',
            mitre_technique: data.investigation.mitre_technique,
            abuseIpdbResult: data.investigation.abuseIpdbResult,
            virusTotalResult: data.investigation.virusTotalResult,
            greyNoiseResult: data.investigation.greyNoiseResult,
            evidence: data.investigation.evidence,
            aptCorrelation: data.investigation.aptCorrelation
          }
        });
      }

      if (data.stage === 'judge_done' && data.judgment) {
        dispatch({
          type: 'UPSERT_EVENT',
          payload: {
            id: data.eventId?.toString(),
            ip: '',
            category: '',
            status: 'judged',
            score: data.judgment.confidence,
            summary: null,
            time: 'Just now',
            recommended_action: data.judgment.recommended_action,
            reasoning: data.judgment.reasoning
          }
        });
      }
    });

    socketInstance.on('event:needs_review', (data) => {
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId?.toString(),
          ip: data.ip,
          category: data.investigation?.attackCategoryGuess || 'unknown',
          status: 'judged',
          score: data.confidence || data.judgment?.confidenceScore,
          summary: data.investigation?.aiSummary,
          time: 'Just now',
          abuseIpdbResult: data.investigation?.abuseIpdbResult,
          virusTotalResult: data.investigation?.virusTotalResult,
          greyNoiseResult: data.investigation?.greyNoiseResult,
          evidence: data.investigation?.evidence,
          mitre_technique: data.investigation?.mitre_technique,
          recommended_action: data.judgment?.recommended_action,
          reasoning: data.judgment?.reasoning,
          plainEnglishSummary: data.plainEnglishSummary
        }
      });

      dispatch({
        type: 'ADD_REVIEW',
        payload: {
          id: data.eventId?.toString(),
          ip: data.ip,
          score: data.confidence || data.judgment?.confidenceScore,
          reason: data.judgment?.reasoning,
          recommended_action: data.judgment?.recommended_action,
          time: 'Just now',
          abuseIpdbResult: data.investigation?.abuseIpdbResult,
          virusTotalResult: data.investigation?.virusTotalResult,
          greyNoiseResult: data.investigation?.greyNoiseResult,
          evidence: data.investigation?.evidence,
          mitre_technique: data.investigation?.mitre_technique,
          plainEnglishSummary: data.plainEnglishSummary
        }
      });
    });

    socketInstance.on('event:responded', (data) => {
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId?.toString(),
          ip: data.ip || '',
          category: '',
          status: 'responded',
          score: data.confidence,
          summary: null,
          time: 'Just now',
          actionTaken: data.action,
          recommended_action: data.action,
          plainEnglishSummary: data.plainEnglishSummary
        }
      });
      dispatch({ type: 'REMOVE_REVIEW', payload: data.eventId?.toString() });
      dispatch({ type: 'SET_PIPELINE_STAGE', payload: { stage: 'record', eventId: data.eventId?.toString() } });
    });

    socketInstance.on('event:closed', (data) => {
      dispatch({
        type: 'UPSERT_EVENT',
        payload: {
          id: data.eventId?.toString(),
          ip: '',
          category: '',
          status: 'closed',
          score: null,
          summary: null,
          time: 'Just now'
        }
      });
      dispatch({ type: 'REMOVE_REVIEW', payload: data.eventId?.toString() });
    });

    return () => { socketInstance.disconnect(); };
  }, []);

  return { state, isConnected, dispatch };
}
