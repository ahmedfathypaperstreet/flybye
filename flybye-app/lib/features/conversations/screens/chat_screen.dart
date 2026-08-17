import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/supabase_providers.dart';
import '../../../core/theme.dart';
import '../../profile/data/profile_repo.dart';
import '../../profile/widgets/report_block_sheet.dart';
import '../data/conversation_repo.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.conversationId});
  final String conversationId;
  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  bool _sending = false;
  String? _otherId;
  String? _otherName;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = ref.read(conversationRepoProvider);
    final other = await repo.otherParticipant(widget.conversationId);
    // Mark the counterpart's messages read on open.
    await repo.markRead(widget.conversationId);
    if (mounted && other != null) {
      setState(() {
        _otherId = other['id'] as String?;
        _otherName = (other['display_name'] as String?)?.isNotEmpty == true
            ? other['display_name'] as String
            : 'Professional';
      });
    }
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await ref
          .read(conversationRepoProvider)
          .sendMessage(widget.conversationId, text);
      _input.clear();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Couldn\'t send. $e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.watch(conversationRepoProvider);
    final me = ref.watch(supabaseClientProvider).auth.currentUser!.id;
    final myProfile = ref.watch(myProfileProvider);
    final verified = myProfile.asData?.value.verified ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text(_otherName ?? 'Chat'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (v) async {
              if (_otherId == null) return;
              await ReportBlockSheet.show(context, _otherId!);
              if (v == 'block' && context.mounted) context.go('/conversations');
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'report',
                child: ListTile(
                  leading: Icon(Icons.flag_outlined),
                  title: Text('Report'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              PopupMenuItem(
                value: 'block',
                child: ListTile(
                  leading: Icon(Icons.block, color: FlyByeColors.danger),
                  title: Text('Report and block',
                      style: TextStyle(color: FlyByeColors.danger),),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<Map<String, dynamic>>>(
              stream: repo.messagesStream(widget.conversationId),
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final msgs = snap.data ?? const [];
                if (msgs.isEmpty) {
                  return Center(
                    child: Text(
                      'No messages yet. Say hello to ${_otherName ?? 'them'}.',
                      style: const TextStyle(color: FlyByeColors.muted),
                    ),
                  );
                }
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (_scroll.hasClients) {
                    _scroll.jumpTo(_scroll.position.maxScrollExtent);
                  }
                });
                return ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 16,),
                  itemCount: msgs.length,
                  itemBuilder: (_, i) {
                    final m = msgs[i];
                    final mine = m['sender_id'] == me;
                    return Align(
                      alignment:
                          mine ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10,),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.78,
                        ),
                        decoration: BoxDecoration(
                          color: mine
                              ? FlyByeColors.primary
                              : FlyByeColors.secondary,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          m['body'] as String,
                          style: TextStyle(
                            color:
                                mine ? Colors.white : FlyByeColors.foreground,
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: verified
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _input,
                            minLines: 1,
                            maxLines: 4,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _send(),
                            decoration: const InputDecoration(
                              hintText: 'Type a message…',
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 12,),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          icon: const Icon(Icons.send),
                          onPressed: _sending ? null : _send,
                        ),
                      ],
                    ),
                  )
                : _VerifyToMessage(),
          ),
        ],
      ),
    );
  }
}

class _VerifyToMessage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: FlyByeColors.card,
        border: Border(top: BorderSide(color: FlyByeColors.border)),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_outline, size: 18, color: FlyByeColors.muted),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Verify your ID to message.',
              style: TextStyle(color: FlyByeColors.muted),
            ),
          ),
          FilledButton(
            onPressed: () => context.push('/verification'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 40),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            child: const Text('Verify'),
          ),
        ],
      ),
    );
  }
}
