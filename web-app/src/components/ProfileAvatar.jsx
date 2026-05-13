import { useEffect, useState } from 'react';
import { getUserInitials, getUserProfileImage } from '../utils/profile';

export function ProfileAvatar({ user, className }) {
  const imageUrl = getUserProfileImage(user);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <span className={className}>
      {imageUrl && !imageFailed ? (
        <img src={imageUrl} alt="" onError={() => setImageFailed(true)} />
      ) : (
        getUserInitials(user)
      )}
    </span>
  );
}
