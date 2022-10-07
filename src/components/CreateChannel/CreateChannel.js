import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, useChatContext } from 'stream-chat-react';
import _debounce from 'lodash.debounce';

import { XButton, XButtonBackground } from '../../assets';

import './CreateChannel.css';

const UserResult = ({ user }) => (
  <li className='messaging-create-channel__user-result'>
    <Avatar image={user.image} name={user.name || user.id} size={40} />
    {user.online && <div className='messaging-create-channel__user-result-online' />}
    <div className='messaging-create-channel__user-result__details'>
      <span>{user.name}</span>
      {/* <span className='messaging-create-channel__user-result__details__last-seen'>{user.online}</span> */}
    </div>
  </li>
);

const CreateChannel = ({ onClose, toggleMobile }) => {
  const { client, setActiveChannel } = useChatContext();

  const [focusedUser, setFocusedUser] = useState(undefined);
  const [inputText, setInputText] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);

  const inputRef = useRef();

  const clearState = () => {
    setInputText('');
    setResultsOpen(false);
    setSearchEmpty(false);
  };

  useEffect(() => {
    const clickListener = () => {
      if (resultsOpen) clearState();
    };

    document.addEventListener('click', clickListener);

    return () => document.removeEventListener('click', clickListener);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const findUsers = async () => {
    if (searching) return;
    setSearching(true);

    try {
      const response = await client.queryUsers(
        {
          id: { $ne: client.userID },
          $and: [{ name: { $autocomplete: inputText } }],
        },
        { id: 1 },
        { limit: 6 },
      );

      if (!response.users.length) {
        setSearchEmpty(true);
      } else {
        setSearchEmpty(false);
        setUsers(response.users);
      }

      setResultsOpen(true);
    } catch (error) {
      console.log({ error });
    }

    setSearching(false);
  };

  const findUsersDebounce = _debounce(findUsers, 100, {
    trailing: true,
  });

  useEffect(() => {
    if (inputText) {
      findUsersDebounce();
    }
  }, [inputText]); // eslint-disable-line react-hooks/exhaustive-deps

  const createChannel = async () => {
    const selectedUsersIds = selectedUsers.map((u) => u.id);

    if (!selectedUsersIds.length) return;

    const conversation = await client.channel('messaging', {
      members: [...selectedUsersIds, client.userID],
    });

    await conversation.watch();

    setActiveChannel(conversation);
    setSelectedUsers([]);
    setUsers([]);
    onClose();
  };

  const addUser = (u) => {
    const isAlreadyAdded = selectedUsers.find((user) => user.id === u.id);
    if (isAlreadyAdded) return;

    setSelectedUsers([...selectedUsers, u]);
    setResultsOpen(false);
    setInputText('');
    inputRef.current.focus();
  };

  const removeUser = (user) => {
    const newUsers = selectedUsers.filter((item) => item.id !== user.id);
    setSelectedUsers(newUsers);
    inputRef.current.focus();
  };

  const handleKeyDown = useCallback(
    (e) => {
      // check for up(38) or down(40) key
      if (e.which === 38) {
        setFocusedUser((prevFocused) => {
          if (prevFocused === undefined) return 0;
          return prevFocused === 0 ? users.length - 1 : prevFocused - 1;
        });
      }
      if (e.which === 40) {
        setFocusedUser((prevFocused) => {
          if (prevFocused === undefined) return 0;
          return prevFocused === users.length - 1 ? 0 : prevFocused + 1;
        });
      }
      if (e.which === 13) {
        e.preventDefault();
        if (focusedUser !== undefined) {
          addUser(users[focusedUser]);
          return setFocusedUser(undefined);
        }
      }
    },
    [users, focusedUser], // eslint-disable-line
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, false);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
  <span></span>
  );
};

export default React.memo(CreateChannel);
