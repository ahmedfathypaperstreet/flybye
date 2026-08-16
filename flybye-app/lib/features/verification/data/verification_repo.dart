import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/supabase_providers.dart';

class VerificationRepo {
  VerificationRepo(this._client);
  final SupabaseClient _client;

  /// Upload a government-ID photo to the private `id-documents` bucket at
  /// `${uid}/...`, then upsert a pending verification request for review.
  Future<void> submit(File file, {String ext = 'jpg'}) async {
    final uid = _client.auth.currentUser!.id;
    final path = '$uid/id-${DateTime.now().millisecondsSinceEpoch}.$ext';

    await _client.storage.from('id-documents').upload(
          path,
          file,
          fileOptions: FileOptions(
            contentType: 'image/$ext',
            upsert: true,
          ),
        );

    await _client.from('verification_requests').upsert(
      {
        'user_id': uid,
        'document_url': path,
        'status': 'pending',
        'reviewed_at': null,
        'reviewed_by': null,
        'rejection_reason': null,
      },
      onConflict: 'user_id',
    );
  }

  /// The current user's rejection reason, if any (for the rejected state).
  Future<String?> rejectionReason() async {
    final uid = _client.auth.currentUser!.id;
    final row = await _client
        .from('verification_requests')
        .select('rejection_reason, status')
        .eq('user_id', uid)
        .maybeSingle();
    if (row == null) return null;
    return row['rejection_reason'] as String?;
  }
}

final verificationRepoProvider = Provider<VerificationRepo>(
  (ref) => VerificationRepo(ref.watch(supabaseClientProvider)),
);
