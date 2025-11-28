import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  CreationPhase,
  CreationSession,
  UploadedImage,
  SuggestionSet,
  IterationRecord,
  VideoSuggestion,
  FinalVideoSpec,
  Locale,
} from "@/types";

interface CreationStore {
  // Current session
  session: CreationSession | null;
  locale: Locale;

  // API Key (for static build)
  apiKey: string | null;

  // Actions
  setLocale: (locale: Locale) => void;
  setApiKey: (key: string | null) => void;

  // Session management
  startNewSession: () => void;
  resetSession: () => void;

  // Phase management
  setPhase: (phase: CreationPhase) => void;

  // Image management
  setImages: (images: UploadedImage[]) => void;
  addImages: (images: UploadedImage[]) => void;
  removeImage: (id: string) => void;

  // Description
  setDescription: (description: string) => void;

  // Suggestions
  setCurrentSuggestions: (suggestions: SuggestionSet) => void;

  // Iterations
  addIteration: (record: IterationRecord) => void;

  // Final spec
  setFinalSpec: (spec: FinalVideoSpec) => void;

  // Generated video
  setGeneratedVideoUrl: (url: string) => void;

  // Helpers
  getSelectedSuggestion: (id: string) => VideoSuggestion | undefined;
}

export const useCreationStore = create<CreationStore>()(
  persist(
    (set, get) => ({
      session: null,
      locale: "zh",
      apiKey: null,

      setLocale: (locale) => set({ locale }),

      setApiKey: (key) => set({ apiKey: key }),

      startNewSession: () => {
        set({
          session: {
            id: uuidv4(),
            phase: "initial-upload",
            startedAt: Date.now(),
            images: [],
            description: "",
            iterations: [],
            currentSuggestions: undefined,
            finalSpec: undefined,
            generatedVideoUrl: undefined,
          },
        });
      },

      resetSession: () => {
        const state = get();
        // Clean up image URLs
        state.session?.images.forEach((img) => {
          if (img.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(img.previewUrl);
          }
        });
        set({ session: null });
      },

      setPhase: (phase) => {
        set((state) => ({
          session: state.session
            ? { ...state.session, phase }
            : null,
        }));
      },

      setImages: (images) => {
        set((state) => ({
          session: state.session
            ? { ...state.session, images }
            : null,
        }));
      },

      addImages: (newImages) => {
        set((state) => {
          if (!state.session) return state;
          const existingImages = state.session.images;
          const maxImages = 3;
          const availableSlots = maxImages - existingImages.length;
          const imagesToAdd = newImages.slice(0, availableSlots);
          return {
            session: {
              ...state.session,
              images: [...existingImages, ...imagesToAdd],
            },
          };
        });
      },

      removeImage: (id) => {
        set((state) => {
          if (!state.session) return state;
          const imageToRemove = state.session.images.find(
            (img) => img.id === id
          );
          if (imageToRemove?.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(imageToRemove.previewUrl);
          }
          return {
            session: {
              ...state.session,
              images: state.session.images.filter((img) => img.id !== id),
            },
          };
        });
      },

      setDescription: (description) => {
        set((state) => ({
          session: state.session
            ? { ...state.session, description }
            : null,
        }));
      },

      setCurrentSuggestions: (suggestions) => {
        set((state) => ({
          session: state.session
            ? { ...state.session, currentSuggestions: suggestions }
            : null,
        }));
      },

      addIteration: (record) => {
        set((state) => ({
          session: state.session
            ? {
                ...state.session,
                iterations: [...state.session.iterations, record],
              }
            : null,
        }));
      },

      setFinalSpec: (spec) => {
        set((state) => ({
          session: state.session
            ? { ...state.session, finalSpec: spec }
            : null,
        }));
      },

      setGeneratedVideoUrl: (url) => {
        set((state) => ({
          session: state.session
            ? { ...state.session, generatedVideoUrl: url }
            : null,
        }));
      },

      getSelectedSuggestion: (id) => {
        const state = get();
        if (!state.session?.currentSuggestions) return undefined;
        return state.session.currentSuggestions.suggestions.find(
          (s) => s.id === id
        );
      },
    }),
    {
      name: "video-creation-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        locale: state.locale,
        apiKey: state.apiKey,
        // Note: We don't persist session as File objects can't be serialized
      }),
    }
  )
);
