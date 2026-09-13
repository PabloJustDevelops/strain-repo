import { Platform, Share } from 'react-native';
import type { View } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { shortId } from './id';

import type { WorkoutSession } from '@/types/domain';

/** Ref al componente WorkoutSummaryCard ya montado en pantalla. */
type CardRef = View | null;

type CaptureRef = typeof import('react-native-view-shot')['captureRef'];

let captureRef: CaptureRef | null = null;
let captureLoadFailed = false;

/**
 * Carga `react-native-view-shot` de forma perezosa: el módulo nativo lanza al
 * importarse cuando no está (Expo Go), y una feature opcional no debe tumbar la
 * pantalla que lo importa.
 */
async function getCaptureRef(): Promise<CaptureRef | null> {
  if (captureRef) return captureRef;
  if (captureLoadFailed) return null;

  try {
    const mod = await import('react-native-view-shot');
    captureRef = mod.captureRef;
  } catch (err) {
    captureLoadFailed = true;
    console.warn('[share] react-native-view-shot no disponible; se comparte solo texto', err);
    return null;
  }
  return captureRef;
}

/**
 * Comparte un workout como imagen + texto vía el diálogo nativo de Android.
 *
 * Flujo:
 * 1. Capturamos la `viewRef` (WorkoutSummaryCard) en PNG.
 * 2. La movemos a una carpeta cacheable.
 * 3. Usamos expo-sharing para abrir el diálogo con imagen + mensaje.
 *
 * Si el módulo de captura no está disponible (p. ej. Expo Go), cae a compartir
 * solo el texto. En iOS el módulo no aplica (Strain es Android-only) pero el
 * código cae a `Share.share()` con texto plano por seguridad.
 */

export interface ShareOptions {
  /** Ref al componente WorkoutSummaryCard ya montado en pantalla. */
  viewRef: React.RefObject<CardRef>;
  /** Workout a compartir. */
  session: WorkoutSession;
  /** Resumen de texto que acompaña la imagen. */
  caption?: string;
  /** Si true, solo abre la imagen en el visor (no comparte). */
  previewOnly?: boolean;
}

export async function shareWorkout({ viewRef, session, caption, previewOnly = false }: ShareOptions): Promise<boolean> {
  if (!viewRef.current) {
    console.warn('[share] viewRef no está listo');
    return false;
  }

  const text =
    caption ??
    `💪 ${session.name}\n` +
      `📊 ${session.totalSets} series · ${Math.round(session.totalVolume).toLocaleString('es-ES')} kg de volumen\n` +
      `📅 ${(session.endedAt ?? new Date()).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}\n\n` +
      `Entrenado con Strain.`;

  const capture = await getCaptureRef();
  if (!capture) {
    return shareText(session, text);
  }

  let imageUri: string;
  try {
    imageUri = await capture(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  } catch (err) {
    console.error('[share] capture failed', err);
    return false;
  }

  // Si estamos en Android, movemos el archivo a cacheDir con un nombre estable.
  if (Platform.OS === 'android') {
    try {
      const dest = `${FileSystem.cacheDirectory}strain-share-${shortId(6)}.png`;
      await FileSystem.copyAsync({ from: imageUri, to: dest });
      imageUri = dest;
    } catch (err) {
      console.warn('[share] copy failed, usando URI original', err);
    }
  }

  if (previewOnly) {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: session.name,
      });
      return true;
    }
    return false;
  }

  if (Platform.OS === 'android' && (await Sharing.isAvailableAsync())) {
    try {
      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir workout',
        UTI: 'public.png',
      });
      return true;
    } catch (err) {
      console.warn('[share] expo-sharing falló, fallback a Share.share', err);
    }
  }

  // Fallback: texto sin imagen
  return shareText(session, text);
}

async function shareText(session: WorkoutSession, text: string): Promise<boolean> {
  try {
    await Share.share({ message: text, title: session.name });
    return true;
  } catch (err) {
    console.error('[share] fallback failed', err);
    return false;
  }
}
