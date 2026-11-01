import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'theme.dart';

/// Asks the user whether to take a photo with the camera or choose one from
/// the library, then opens the matching picker. Returns null if the user
/// cancels at either step.
///
/// [camera] picks which lens the camera opens on: front for headshots, rear
/// for ID documents.
Future<XFile?> pickPhoto(
  BuildContext context, {
  CameraDevice camera = CameraDevice.rear,
  int imageQuality = 85,
  double maxWidth = 1600,
}) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    backgroundColor: FlyByeColors.card,
    showDragHandle: true,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined),
            title: const Text('Take photo'),
            onTap: () => Navigator.pop(ctx, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Choose from library'),
            onTap: () => Navigator.pop(ctx, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
  if (source == null) return null;
  return ImagePicker().pickImage(
    source: source,
    preferredCameraDevice: camera,
    imageQuality: imageQuality,
    maxWidth: maxWidth,
  );
}
